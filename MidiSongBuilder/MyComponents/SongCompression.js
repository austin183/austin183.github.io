function getSongCompression(){
    return{
        getCompressedJson(tracks){
            var compressedJson = {
                tracks: []
            };
            for(var i = 1; i < tracks.length; i++)
            {
                var bigTrack = tracks[i];
                var track = {
                    name: bigTrack.name,
                    notes: []
                };
                bigTrack.notes.forEach(note => {
                    //num.toFixed(6)
                    var note = {
                        t: note.time.toFixed(6),
                        d: note.duration.toFixed(6),
                        v: note.velocity.toFixed(6),
                        n: note.name
                    }
                    
                    track.notes.push(note);
                });
                compressedJson.tracks.push(track);
            }
            return compressedJson;
        },
        getDecompressedSong: function(tracks){
            var decompressedJson = {
                tracks: []
            };
            for(var i = 0; i < tracks.length; i++){
                var smallTrack = tracks[i];
                var track = {
                    name: smallTrack.name,
                    notes: []
                };
                smallTrack.notes.forEach(note => {
                    var note = {
                        time: parseFloat(note.t),
                        duration: parseFloat(note.d),
                        velocity: parseFloat(note.v),
                        name: note.n
                    }
                    track.notes.push(note);
                });
                decompressedJson.tracks.push(track);
            }
            return decompressedJson;
        }
    };
}