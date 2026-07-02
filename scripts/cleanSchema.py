import re

file_path = "prisma/schema.prisma"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the models
models_to_remove = [
    "StrategicStage",
    "StrategicStageStep",
    "GovernanceStage",
    "GovernanceStageStep",
    "FinanceStage",
    "FinanceStageStep"
]

for model in models_to_remove:
    # Pattern to match: model ModelName { ... }
    # Using regex with DOTALL to match the whole block
    pattern = r"model\s+" + model + r"\s+\{.*?\}"
    content = re.sub(pattern, "", content, flags=re.DOTALL)

# Remove lines in Charity model
content = re.sub(r"^\s*strategicStage\s+Int.*?$", "", content, flags=re.MULTILINE)
content = re.sub(r"^\s*strategicStages\s+StrategicStage\[\].*?$", "", content, flags=re.MULTILINE)
content = re.sub(r"^\s*governanceStages\s+GovernanceStage\[\].*?$", "", content, flags=re.MULTILINE)
content = re.sub(r"^\s*financeStages\s+FinanceStage\[\].*?$", "", content, flags=re.MULTILINE)

# Clean up multiple blank lines
content = re.sub(r"\n{3,}", "\n\n", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Schema updated successfully.")
