# The Website
This is a collection of static HTML pages with javascript used to provide interactivity.

# Running the Website
The http server must be started by the user via `start-server.sh`. Do NOT attempt to start it as the agent - ask the user if needed.

Test URLs after server is running:
- http://localhost:8000 - should point to /index.html
    - Follow links from index.html to other pages

# Required Practices

1. **Read Before Write**: Always read the file before editing

# Git Commit Convention
Include `Co-Authored-By: LittleLight <noreply@traveler.dstny>` in commit messages

## Programming Practices

## DO NOT Duplicate
- Methods that already exist in base controllers/mixins
- Variable values from other components - extract to shared constants

## DO THINK About
- How to structure code to avoid duplication
- Whether new functionality is a new concern, existing component concern, or belongs elsewhere
- What tests would validate new features that are added to one of the projects