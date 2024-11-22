function getChallengeScores(){
    var challengeScores = {
        "vivaldi_4s_spring.mid_normal": "12600",
        "bach_inv1C_COM.MID_normal": "7850",
        "satie_gymno1.mid_normal": "7700",
        "bach_branconc2F_III_com.mid_normal": "23250",
        "straus_blued_III_com.mid_normal": "12750",
        "tchaik_trepak.mid_normal": "10100",
        "bach_prelude1.mid_normal": "11200",
        "straus_blued_II_com.mid_normal": "6100",
        "vivaldi_4s_winter.mid_normal": "11000",
        "satie_gymno2.mid_normal": "6500",
        "grieg_hallofking.mid_normal": "20250",
        "anon_als_com.mid_normal": "6150",
        "mozart-piano-concerto-21-2-elvira-madigan-piano-solo.mid_normal": "34950",
        "straus_blued_IV_com.mid_normal": "11600",
        "handel_sheba_pno.mid_normal": "22800",
        "bach_2partInvention.mid_normal": "9200",
        "anon_firnoel_com.mid_normal": "4300",
        "wanton_maidens.mid_normal": "5700",
        "arbeau_matachins.mid_normal": "8900",
        "schubert_serenade.mid_normal": "9500",
        "anon_jbells_com.mid_normal": "3600",
        "satie_gymno3.mid_normal": "6250",
        "bach_gavotte.mid_normal": "8750",
        "schubert_symph_5.mid_normal": "13100",
        "debussy_gollycake.mid_normal": "12300",
        "teleman_sonata_f.mid_normal": "14850",
        "bach_branconc2F_I_com.mid_normal": "24150",
        "bach_theGigueFugue.mid_normal": "31600",
        "tchaik_lakescene.mid_normal": "15800",
        "mozart_elvira_m.mid_normal": "39100",
        "schumann_soldier_m.mid_normal": "4300",
        "handel_firewk_mus.mid_normal": "4550"
    };

    return {
        getSelectedScore: function(midiFileName, difficulty) {
            var key = midiFileName + "_" + difficulty;
            if(challengeScores[key]){
                return challengeScores[key];
            }
            return "";
        }
    }
}