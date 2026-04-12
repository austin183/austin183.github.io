ollama show gemma3:27b
```
(base) austin@Mac austin183.github.io % ollama show gemma3:27b
  Model
    architecture        gemma3    
    parameters          27.4B     
    context length      8192      
    embedding length    5376      
    quantization        Q4_K_M    

  Capabilities
    completion    
    vision 
```

Rankings took 50GB RAM

Round 1:
* PatchCarolyn vs PatchJennifer: PatchJennifer wins
* PatchLinda vs PatchPamela: PatchPamela wins
* PatchRiver vs PatchSamantha: PatchSamantha wins
* PatchStacey vs PatchTricia: PatchTricia wins
* PatchChristopher vs PatchCollin: Collin wins
* PatchDavid vs PatchLeonard: Leonard wins
* PatchMichael vs PatchPaul: Paul wins
* PatchRandy vs PatchTimothy: Timothy wins

Round 1 testing gender biased
* PatchJennifer vs PatchMichael: Michael...

Looking at Gemma's Advertised Context Length of 8192, I think what we are seeing is a broken context limit.

Time to move on to let other LLM's try to be more full judges.