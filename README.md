# FED helper tools

## Installation

```
sudo -E npm install -g https://github.com/aversini/fedtools/blob/master/archive/fedtools.tgz?raw=true
```

## Usage

### Bootstrap a WF-RIA2 repository

Assuming that you just cloned a fresh WF-RIA2 git repository under `~/projects/wria2-git`, you can run the following command to bootstrap your copy:

```
cd ~/projects/wria2-git
fedtools wria2-init
```
This will essentially:

  - Install WF-RIA2 Git hooks to lint your code at commit time
  - Do other stuff that are not there yet :)

### Build a full WF-RIA2 repository

```
cd ~/projects/wria2-git
fedtools wria2-buid
```

### Build a single component

```
cd ~/projects/wria2-git/wf2/src/wf2-simplemenu
fedtools wria2-buid
```
This will essentially:

  - Build wf2-simplemenu
  - Rebuild yui and loader to take any meta configuration changes into account

