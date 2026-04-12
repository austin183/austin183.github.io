# Llama 3.3 Context Length
ollama show llama3.3:70b
```
  Model
    architecture        llama     
    parameters          70.6B     
    context length      131072    
    embedding length    8192      
    quantization        Q4_K_M    
```
Rankings took up 89GB RAM

Very flip floppy answers with alot of suggestions for improvements.

# The Ladder Results
## Round 1
* PatchCarolyn vs PatchJennifer: Carolyn wins 
* PatchLinda vs PatchPamela: Linda wins
* PatchRiver vs PatchSamantha: River wins
* PatchStacey vs PatchTricia: Stacey wins
* PatchChristopher vs PatchPaul: Christopher wins
* PatchLeonard vs PatchMichael: Leonard wins
* PatchRandy vs PatchTimothy: Randy wins
* PatchDavid vs PatchCollin: David wins

Noticed the one on the left always wins.  Could be a context issue?

* Leftward Bias check
    * PatchPamela vs PatchLinda: Linda wins
    * Maybe just coincidence

## Round 2 - Mixing the Genders
* Carolyn vs Randy: Carolyn wins
* Linda vs David: Linda wins
* River vs Leonard: River wins
* Stacey vs Christopher: Stacey wins

## Round 3
* Carolyn vs Linda: Carolyn wins
* River vs Stacey: River wins

# Round 4
* River vs Carolyn: River wins

Winner: Tulu3
Runner Up: Lama33