# Get Branches as Patch files
```
(base) austin@Mac austin183.github.io % git branch
  BlogPostStyle/DeepCoder_test
  BlogPostStyle/DeepSeekR1_tst_test
  BlogPostStyle/Gemma3_test
  BlogPostStPatchyle/Lama3_3_1st_test
  BlogPostStyle/Nemotron_1st_test
  BlogPostStyle/Phi4_1st_test
  BlogPostStyle/Qwen3_1st_test
  BlogPostStyle/Tulu3_1st_test
* main
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Phi4_1st_test > phi4Patch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/DeepCoder_test > deepCoderPatch.diff 
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/DeepSeekR1_tst_test > deepSeekPatch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Gemma3_test > gemma3Patch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Lama3_3_1st_test > lama33Patch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Nemotron_1st_test > nemotronPatch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Qwen3_1st_test > qwen3Patch.diff
(base) austin@Mac austin183.github.io % git diff main...BlogPostStyle/Tulu3_1st_test > tulu3Patch.diff
(base) austin@Mac austin183.github.io % 

```
# Learnings
## My Global Context was Too Short
* I needed to adjust the configs in Continue's config files.
* Based on config docs at https://docs.continue.dev/reference#models
* I converted from a config.json file to a config.yaml file, which was an option at the top of the config file.

Then I added this section, based on https://github.com/continuedev/continue/pull/4602#issuecomment-2730905937 -
```
models:
  - name: Autodetect
    provider: ollama
    model: AUTODETECT
    contextLength: 100000 #Adjusting Context Length
    defaultCompletionOptions:
     contextLength: 100000 #Adjusting Context Length
     maxTokens: 8192
    roles:
      - chat
```
> Note: When overriding context length, some LLMs have higher maxes than others.  You can find out an LLM's max context lenght by running `ollama show [model]`

# Ladder Process
* Ask each LLM which Patch looks best
* Like an eye test, "1" or "2"
* Need to anonymize results
  * Also found something interesting when using Numeric identifiers - Gemma 3 treated them as "older" and "newer" patches and always selected the "newer" patch
  * When I changed to girls' names, it said they were almost the same
  * Will also try with boys's names, and then see how it compares girl to boy names
    * 1 Samantha Michael DeepCoder
    * 2 Jennifer Collin DeepSeek
    * 3 Stacey David Gemma3
    * 4 Carolyn Christopher Lama33
    * 5 Linda Leonard Nemotron
    * 6 Pamela Paul Phi4
    * 7 Tricia Timothy Qwen3
    * 8 River Randy Tulu3
* "Can you please compare the patches @PatchA to @PatchB  and tell me what is good about each and what is bad about each? If you had to say one patch was better than the other and why, which would you choose?"

# Results
## Per LLM Ladders
* DeepCoder's Winner
  * DeepCoder funnily enough
  * Runner up - Llama 3.3
* DeepSeek's Winner
  * DeepCoder
  * Runner up - DeepSeek
* Gemma3's Winner
  * Not enough Context Length to judge
  * 8k
* Lama33's Winner
  * Tulu3
  * Runner up - Llama3.3
* Nemotron's Winner
  * DeepSeek
  * Runner up - Llama 3.3
* Tulu3's Winner
  * DeepCoder
  * Runner Up - DeepSeek
* Phi4's Winner
  * Not enough Context Length to Judge
  * 16k
* Qwen3's Winner
  * Not enough Context Length to Judge
  * 40k
* My Winner, Based on Feels - Tulu3, for least corrections and fastest full success
* My Winner, Based on Presentation - DeepCoder, for cool green theme

## Aggregation
* DeepCoder got 3 wins and won my best presentation
* DeepSeek got 1 win and 2 Runners Up
* Tulu3 got 1 win and won by best experience with the LLMs
* Llama 3.3 got 3 Runners Up

# Building the Final Branch
I want to take the good from the LLMs and apply them as a final branch.  I liked the style from DeepCoder.  I need to check to see if the theme switching behavior works best on that branch already.  Then perhaps I can go back and see how else I could clean up that implementation.

After reviewing the branches, it looks like the Tulu3 branch does the theme switching most smoothly, and DeepCoder has the best Style.  I will take the javascript from Tulu3 and the css from DeepCoder and put them in a src folder on the DeepCoder branch and then merge it.