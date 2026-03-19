# Workspace Rules

## Forbidden Actions
DO NOT read any files in the `Libraries` directory. This folder contains large JavaScript libraries that should not be accessed directly for any reason.

All interactions with code in MidiSongBuilder/Libraries should be limited to directory operations (listing, globbing) and should never include reading file contents.

DO NOT start the http server.  If it is not running, ask for it to be started.  DO NOT try to start it yourself.

## Code Structure Imperatives
DO NOT duplicate:
- methods
- values for variables from other components

DO THINK about:
- How would you need to structure the code to keep from needing to duplicate things?
- Is what we are adding a new concern, a concern for another existing component, or the concern of the component we are in?

## Read Files Before Writing
Harnesses expect files to be read before getting written to.  Please be sure to read before writing.

## Test Changes
- [ ] `npm test` from /Users/austin/workspace/austin183.github.io/MidiSongBuilder/MyESModules
- [ ] Test http://localhost:8000/MidiSongBuilder/Midiestro3D.html
    - Page Loads
    - Song can be selected
    - Play button enables and can be clicked with no errors
  - [ ] Test http://localhost:8000/MidiSongBuilder/Midiestro.html
    - Page Loads
    - Song can be selected
    - Play button enables and can be clicked with no errors

## Committing to Github
Sign Commits with `Co-Authored-By: LittleLight <noreply@traveler.dstny>`