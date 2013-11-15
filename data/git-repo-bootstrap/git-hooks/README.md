# Git Hooks

## jshint hook

- pre-commit
- pre-commit.js
- jshintForJs.config

This hook will run jshint over Javascript files that are currently staged. If jshint finds at least one error in at least one file, the script returns non-zero which in turns prevent the commit. It is divided into 2 files, one bash script (pre-commit) and one node.js script (pre-commit.js) plus a configuration file for jshint (jshintForJs.config)

To install this hook, you need to copy the 3 afore-mentioned files to your local hook directory, plus the node package file, and install the node dependencies:

```
cd my-project
cp ~/git-hooks/pre-commit .git/hooks/pre-commit
cp ~/git-hooks/pre-commit.js .git/hooks/pre-commit.js
cp ~/git-hooks/jshintForJs.config .git/hooks/jshintForJs.config
cp ~/git-hooks/package.json .git/hooks/package.json
cd .git/hooks; npm install; cd -

```
That's it! Next time you try to commit some JavaScript files, they will be linted with jshint.

## commit message hook

- commit-msg
- commit-msg.js

This hook will run once the pre-commit hook has given the green light. It will check for the message associated with the commit and will return non-zero if it doesn't match certain pattern (in our case, if the message doesn't contain a JIRA ticket descriptor or the bypass all flag __NO TICKET__). It is divided into 2 files, one bash script (commit-msg) and one node.js script (commit-msg.js)

To install this hook, you need to copy the 2 afore-mentioned files to your local hook directory, plus the node package file, and install the node dependencies:

```
cd my-project
cp ~/git-hooks/commit-msg .git/hooks/commit-msg
cp ~/git-hooks/commit-msg.js .git/hooks/commit-msg.js
cp ~/git-hooks/package.json .git/hooks/package.json
cd .git/hooks; npm install; cd -

```
That's it! Next time you try to commit anything, the commit will fail if the comment does not contain a JIRA ticket number or the flag __NO TICKET__.
