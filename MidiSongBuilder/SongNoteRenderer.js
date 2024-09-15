function getSongNoteRenderer(){
    return {
        invertKeyNoteMap: function(keyNoteMap){
            var invertedKeyNoteMap = {};
            for(var key in keyNoteMap){
                invertedKeyNoteMap[keyNoteMap[key]] = key;
            }
            return invertedKeyNoteMap;
        },
        renderSongNotes: function(song, keyNoteMap){
            var renderedSongNotes = "";
            var renderedSongNotesOnKeyMap = "";
            var invertedKeyNoteMap = this.invertKeyNoteMap(keyNoteMap);

            song.forEach(function(note){
                renderedSongNotes += note.note + " ";
                renderedSongNotesOnKeyMap += invertedKeyNoteMap[note.note] + " ";
            });

            return {
                renderedSongNotes: renderedSongNotes,
                renderedSongNotesOnKeyMap: renderedSongNotesOnKeyMap
            };
        }
    };
    
}