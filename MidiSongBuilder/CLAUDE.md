# Workspace Rules

DO NOT read any files in the `Libraries` directory. This folder contains large JavaScript libraries that should not be accessed directly for any reason.

All interactions with code in MidiSongBuilder/Libraries should be limited to directory operations (listing, globbing) and should never include reading file contents.