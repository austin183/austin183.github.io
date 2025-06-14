# BlogPostStyling with LLMs
This project was to introduce more style and presentation with the Blog Posts on this website, testing how different LLMs would tackle the problem.

# Results
The winner was DeepCoder, but it had some user experience issues that I plugged with the implementation provided later by Tulu3:70b.  The conversations leading to the final mergeable code can be found in the folder with this ReadMe.

# Rankings
More information about how the judging went can be found in [This Pull Request for the Rankings and related LLM Reasons for Rank](https://github.com/austin183/austin183.github.io/pull/9)

# LLM Working Sessions
## In Video Form
There is a video series of working with the LLMs at [LLM Sessions by Mind of a Fighting Lion Enthusiast](https://youtube.com/playlist?list=PLeowZcBbLxmIrGq7r0j4TQe5DZUSErlwA&si=Gl_nVDUL1eJ0_6cw)

## In Text Form
There is collection of Pull Requests that reflect the changes offered by each LLM given the timebox and context I could provide.  

* [Phi4](https://ollama.com/library/phi4)
    * [Pull Request #1](https://github.com/austin183/austin183.github.io/pull/1)
    * [Session 1 on Youtube - 45 mins](https://youtu.be/PwHpRNKE_CI?si=3pYT1E26lFmUPk5m)
    * [Session 2 on Youtube - 30 mins](https://youtu.be/PwHpRNKE_CI?si=rqwHnSanI-JoX_5f)
    * It did not go very well, but part of that could have been me ramping up with what I wanted from the experiments
* [DeepCoder](https://ollama.com/library/deepcoder)
    * [Pull Request #2)) [https://github.com/austin183/austin183.github.io/pull/2)
    * [Session 1 on Youtube - 48 mins](https://youtu.be/e8g7e-XE8Eo?si=sMEYuGJXU60eP_4H)
    * [Session 2 on Youtube - 27 mins](https://youtu.be/7vBNuTRz-tQ?si=1oIzsKQ72iFyoE-C)
    * This one was the winner, so it went pretty well
* [Gemma3](https://ollama.com/library/gemma3)
    * [Pull Request 3](https://github.com/austin183/austin183.github.io/pull/3)
    * [Session 1 on Youtube - 19 mins](https://youtu.be/rIX8PLN32a0?si=dG0VT5adPQhsrJvO)
    * [Session 2 on Youtube - 14 mins](https://youtu.be/-MvyL5S5XsI?si=bnc0zNshF8MVMoRG)
    * It was fast to respond, but it often had the wrong answer the first time around.  The code did not fare well in the Rankings either.
* [Nemotron](https://ollama.com/library/nemotron)
    * [Pull Request 4](https://github.com/austin183/austin183.github.io/pull/4)
    * [Session 1 on Youtube - 36 mins](https://youtu.be/prWYFBV0SVE?si=-uhjsqO6_EO-xvdX)
    * [Session 2 on Youtube - 35 mins](https://youtu.be/YtbjNq5KiGQ?si=yt7e4x_vBaZXVJAG)
    * It did pretty well, but it could not figure out how to fix the Text Flow issue at the end, and I borrowed the answer from another LLM
* [Qwen3](https://ollama.com/library/qwen3:32b)
    * [Pull Request 5](https://github.com/austin183/austin183.github.io/pull/5)
    * [Session 1 on Youtube - 54 mins](https://youtu.be/O9TUZol3Jmc?si=_85HlP__cyLTm8-7)
    * [Session 2 on Youtube - 23 mins](https://youtu.be/T9EwLRMFpvs?si=Di-0u199bwwU_sLx)
    * It got things wrong a whole lot, and it did not do well in the rankings
* [Tulu3](https://ollama.com/library/tulu3:70b)
    * [Pull Request 6](https://github.com/austin183/austin183.github.io/pull/6)
    * [Session 1 on Youtube - 30 mins](https://youtu.be/ghcmkFK30Es)
    * Got everything done in first go without many mistakes.
    * Felt good and productive
* [Llama 3.3](https://ollama.com/library/llama3.3:70b)
    * [Pull Request 7](https://github.com/austin183/austin183.github.io/pull/7)
    * [Session 1 on Youtube - 46 mins](https://youtu.be/J44kalF2NH0)
    * Relatively quick, but I ran into several issues that needed to be fixed before getting to the right output.
* [DeepSeek](https://ollama.com/library/deepseek-r1:70b)
    * [Pull Request 8](https://github.com/austin183/austin183.github.io/pull/8)
    * [Session 1 on Youtube - 51 mins](https://youtu.be/lg4FsLYfd3g)
    * This one did work with Roo, although it encountered bugs which forced me to switch over to Continue
    * Got through all the experiment stages in one session, although it did get stuck on the Back button persistence issue for a long time

# Final Thoughts
## The LLMs
It is good to have a mix of LLMs to query.  I liked working with Tulu3 the most, but I think several LLMs have merit.  In future experiments, I will probably drop phi4, qwen3, nemotron, and gemma3 because they did not feel good to work with.  I also downloaded Llama 4, which may not fit in my RAM with full context and devstral:24b, which I need to try out.  I may need to have a video about how to adjust context_lengths for an LLM and to show how it affects RAM usage.

## My Scientific Process
My scientific process is not very consistent for each iteration.  In future experiments, I could spend more time in the Preparation stage to try to get a more consistent test, where I give less input in each loop.  Someone left some comments on the DeepSeek session with some suggestions:
* Customize Roo's Instructions to work better with local open LLMs
* Write an end to end test around the final product I want to see so the LLM can work towards that goal without me introducing variations in the experiment.
