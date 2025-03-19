import os

# Define file paths
input_file = "copies.csv"  # Change to the actual input file path
directory = "lists"  # Change to the directory containing files to be processed

# Read the input file and store lines in a set
with open(input_file, "r", encoding="utf-8") as f:
    search_lines = set(line.strip() for line in f if line.strip())

modified_files = []

# Iterate through all files in the directory
for filename in os.listdir(directory):
    file_path = os.path.join(directory, filename)

    if os.path.isfile(file_path):
        # Read file content
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # Filter out lines that match any line from the input file
        filtered_lines = []
        removed_lines = []


        for line in lines:
            stripped_line = line.strip()
            if any(search_text in stripped_line for search_text in search_lines):
                removed_lines.append(stripped_line)
            else:
                filtered_lines.append(line)

        # If any lines were removed, update the file and log the changes
        if removed_lines:
            modified_files.append(file_path)

            # Write the modified content back to the file
            with open(file_path, "w", encoding="utf-8") as f:
                f.writelines(filtered_lines)

            # Log removed lines
            print(f"File: {file_path}\n")
            print("\n".join(removed_lines) + "\n\n")


