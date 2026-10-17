#!/usr/bin/env python3
"""Generate the Realtime Database rules that give each student access to their own
Guild only (GDPR data minimisation) while staff keep full access.

Usage:  python security/build_rules.py <path-to-database.rules.json> [--open-studio]

The file at <path> is the project's existing rules file (it also holds the Marking
Tracker's nodes, which are left untouched). This script only replaces the `studio`
and `studio_test` nodes. `studio_test` is an identical copy used for end-to-end
testing against synthetic data before the live `studio` node is switched over.

With --open-studio the live `studio` node keeps its old fully-open rules while
`studio_test` gets the new ones (the pre-cutover state).
"""
import json, sys

def studio_rules(R):
    A = f"root.child('{R}/__access/'+auth.uid)"
    role = f"{A}.child('role').val()"
    STAFF = f"auth != null && ({role} === 'leader' || {role} === 'lecturer')"
    LEADER = f"auth != null && {role} === 'leader'"
    CLAIMED = f"auth != null && ({role} === 'leader' || {role} === 'lecturer' || {role} === 'student')"
    STU = f"auth != null && {role} === 'student' && {A}.child('cohort').val() === $cohort"
    MYGID = f"{A}.child('gid').val()"
    MYSID = f"{A}.child('sid').val()"
    OWN_GUILD = f"({STU}) && {MYGID} === $gid"
    PEER_TARGET = (f"({STU}) && root.child('{R}/'+$cohort+'/peerReviews/'+$wk+'/'+{MYGID}+'/targetGuildId').val() === $gid")
    OWN_STUDENT_FIELD = f"({STU}) && {MYSID} === $sid"

    nm = "newData.child('name').val()"
    idx = lambda leaf: f"root.child('{R}/'+newData.child('cohort').val()+'/nameIndex/'+{nm}+'/{leaf}').val()"
    leader_claim = (f"newData.child('role').val() === 'leader' && newData.hasChildren(['role','proof']) && "
                    f"root.child('{R}/__secrets/leaderCode').exists() && "
                    f"newData.child('proof').val() === root.child('{R}/__secrets/leaderCode').val()")
    lecturer_claim = (f"newData.child('role').val() === 'lecturer' && newData.hasChildren(['role','id','proof']) && "
                      f"newData.child('proof').val() === root.child('{R}/__teachingTeam/'+newData.child('id').val()+'/pin').val()")
    student_claim = (f"newData.child('role').val() === 'student' && newData.hasChildren(['role','cohort','name','sid','gid']) && "
                     f"{idx('sid')} === newData.child('sid').val() && {idx('gid')} === newData.child('gid').val()")

    return {
        ".read": False, ".write": False,
        "__access": {"$uid": {
            ".read": "auth != null && auth.uid === $uid",
            ".write": "auth != null && auth.uid === $uid",
            ".validate": f"({leader_claim}) || ({lecturer_claim}) || ({student_claim})",
            "role": {".validate": "newData.isString()"},
            "proof": {".validate": "newData.isString() && newData.val().length < 100"},
            "id": {".validate": "newData.isString() && newData.val().length < 60"},
            "cohort": {".validate": "newData.isString() && newData.val().matches(/^c_[A-Za-z0-9_-]+$/)"},
            "name": {".validate": "newData.isString() && newData.val().matches(/^[a-z0-9-]+$/) && newData.val().length < 200"},
            "sid": {".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]+$/)"},
            "gid": {".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]+$/)"},
            "ts": {".validate": "newData.isNumber()"},
            "$other": {".validate": False},
        }},
        "__secrets": {".read": False, ".write": LEADER},
        "__teachingTeam": {".read": LEADER, ".write": LEADER},
        "__teamDirectory": {".read": "auth != null", ".write": LEADER},
        "__cohorts": {".read": "auth != null", ".write": STAFF},
        "__config": {"aiKey": {".read": CLAIMED, ".write": LEADER}, "$other": {".read": STAFF, ".write": STAFF}},
        # Public by design: external certificate verification reads one record by its id.
        "__certificates": {"$id": {".read": True, ".write": CLAIMED}},
        "$cohort": {
            # Only real cohort nodes (c_*): this keeps the wildcard from ever applying to
            # the reserved __secrets / __teachingTeam / __access nodes above.
            ".read": f"({STAFF}) && $cohort.matches(/^c_[A-Za-z0-9_-]+$/)",
            ".write": f"({STAFF}) && $cohort.matches(/^c_[A-Za-z0-9_-]+$/)",
            "nameIndex": {".read": False, "$key": {".read": "auth != null"}},
            "config": {".read": STU},
            "quests": {".read": STU},
            "announcements": {".read": STU},
            "guildSummary": {".read": STU, "$gid": {".write": OWN_GUILD}},
            "peerReviews": {"$wk": {"$gid": {".read": OWN_GUILD, ".write": OWN_GUILD}}},
            "guilds": {"$gid": {
                ".read": OWN_GUILD,
                "milestones": {".write": OWN_GUILD, "$wk": {".read": PEER_TARGET}},
                "artefacts": {".write": OWN_GUILD},
                "prototype": {".write": OWN_GUILD},
                "company": {".write": OWN_GUILD},
                "currentRoles": {".write": OWN_GUILD},
            }},
            "students": {"$sid": {
                ".read": f"({STU}) && ({MYSID} === $sid || data.child('guildId').val() === {MYGID})",
                "business": {".write": OWN_STUDENT_FIELD},
                "individualCompanyDetail": {".write": OWN_STUDENT_FIELD},
                "certificateId": {".write": OWN_STUDENT_FIELD},
            }},
        },
    }

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    open_studio = '--open-studio' in sys.argv
    d = json.load(open(path))
    d['rules']['studio'] = {".read": True, ".write": True} if open_studio else studio_rules('studio')
    d['rules']['studio_test'] = studio_rules('studio_test')
    json.dump(d, open(path, 'w'), indent=2)
    print(('OPEN' if open_studio else 'RESTRICTED'), 'studio; restricted studio_test ->', path)

if __name__ == '__main__':
    main()
