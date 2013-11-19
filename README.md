# FED helper tools

## Installation

```
npm install -g fedtools
```

## Usage

### Bootstrap a WF-RIA2 repository

```
cd ~/projects
fedtools wria2-init
```
This will essentially:

  - Ask for several options:
    - Do you want to clone or use an existing repository
    - Where do you want to clone (if you choose to clone)
    - Where is the local repository (if you choose not to clone)
    - Which branch do you want to checkout
    - Provide an alternative URL to the repo (if you choose to clone)
  - It will then bootstrap a wria2 repository:
    - Clone under the path you chose if you decided to clone
    - Install git hooks to lint your code at commit time
    - Switch to the branch you provided
    - Copy YUI3 source files into your repository

### Build a full WF-RIA2 repository

```
cd ~/projects/wria2-git
fedtools wria2-build
```

### Build a single component

```
cd ~/projects/wria2-git/wf2/src/wf2-simplemenu
fedtools wria2-build
```
This will essentially:

  - Build wf2-simplemenu
  - Rebuild yui and loader to take any meta configuration changes into account

