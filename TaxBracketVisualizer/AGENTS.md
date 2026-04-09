# Running the Application
The http server must be started manually via `start-server.sh`. Do NOT attempt to start it yourself - ask the user if needed.

Test URLs after server is running:
http://localhost:8000/TaxBracketVisualizer/index.html

## Check your capabilities for testing first
Can you view and interpret images?  If not, don't try to take screenshots.  Do use playwright structure snapshots though if available for text based interpretation.

# Reviewing Git Activity
This folder exists in the austin183.github.io repo, one level up.

austin183.github.io
    - TaxBracketVisualizer
        - index.html
        - Other files and folders
    - Other files and folders

# Forbidden Actions

## DO NOT Duplicate
- Methods that already exist in base controllers/mixins
- Variable values from other components - extract to shared constants

## DO THINK About
- How to structure code to avoid duplication
- Whether new functionality is a new concern, existing component concern, or belongs elsewhere

