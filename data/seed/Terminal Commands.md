---
title: Terminal Commands
tags: [terminal, commands, reference, shell]
created: 2026-04-10
---

# Terminal Commands Reference

Open the **[[Terminal]]** app and type commands to work with the virtual file system.

## Navigation

```bash
pwd                    # Print working directory
cd /notes              # Change to /notes directory
cd ..                  # Go up one level
cd ~                   # Go to home directory (/)
ls                     # List files in current directory
ls -l                  # List with details (size, date)
ls /notes              # List specific directory
```

## File Operations

```bash
touch myfile.md        # Create empty file
cat Welcome.md         # Display file contents
mkdir projects         # Create directory
mkdir -p a/b/c         # Create nested directories
rm myfile.md           # Delete file
rm -r myfolder         # Delete folder and contents
mv old.md new.md       # Rename / move file
cp source.md dest.md   # Copy file
```

## Search & Find

```bash
find / -name "*.md"    # Find all markdown files
find /notes -name "K*" # Find files starting with K
grep "wikilink" *.md   # Search content in files
grep -r "TODO" /notes  # Recursive content search
```

## App Integration

```bash
edit Welcome.md        # Open file in Markdown Editor
open Welcome.md        # Open with default app
open /notes            # Open folder in File Manager
```

## System

```bash
echo "Hello world"     # Print text
echo "text" > file.md  # Write text to file
echo "more" >> file.md # Append text to file
date                   # Show current date/time
whoami                 # Show current user
history                # Show command history
clear                  # Clear terminal
help                   # Show all available commands
neofetch               # Show system info (fun!)
theme dark             # Switch to dark mode
theme light            # Switch to light mode
```

## Keyboard Shortcuts in Terminal

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate command history |
| `Tab` | Autocomplete command or path |
| `Ctrl+C` | Cancel current command |
| `Ctrl+L` | Clear screen |
| `Ctrl+R` | Search history |

## Related

- [[Getting Started]]
- [[File Manager]]
- [[Markdown Editor]]
- [[Welcome to BrowserOS]]
