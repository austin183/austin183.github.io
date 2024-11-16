#!/bin/bash

# Check if the provided directory path exists
if [ ! -d "$1" ]; then
  echo "Error: Directory '$1' does not exist."
  exit 1
fi

# Loop through each file found using find command
find "$1" -type f \( -name "*.js" -o -name "*.html" \) \
  -exec sh -c 'sed -i "s/[[:space:]]*$//g; s/[\t]/    /g" {}' {} \;