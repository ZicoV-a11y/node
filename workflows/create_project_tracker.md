# Create Project Tracker Workflow

## Objective
Generate an Excel workbook with interconnected project management tables.

## Output
Excel file (`.xlsx`) with 4 sheets:

| Sheet | Purpose |
|-------|---------|
| **People** | Team members (ID, name, role, email, rate) |
| **Projects** | Projects (ID, name, client, dates, budget) |
| **Tasks** | Tasks linked to people and projects |
| **Dashboard** | Summary metrics, charts, lookups |

## Features

### Dropdown Validation
- **Assignee** → pulls from People sheet
- **Project** → pulls from Projects sheet
- **Status** → Not Started, In Progress, On Hold, Completed, Cancelled
- **Priority** → Low, Medium, High, Critical

### Auto-Calculations (Dashboard)
- Total/completed/in-progress task counts
- Completion rate percentage
- Hours estimated vs actual
- Tasks by project breakdown
- Tasks by assignee breakdown

## Tool
`tools/create_project_tracker.py`

## Usage
```bash
python tools/create_project_tracker.py
```

## Output Location
`.tmp/project_tracker.xlsx`

## Customization
To modify the template:
1. Edit `create_project_tracker.py`
2. Adjust sample data in `people_data`, `project_data`, `task_data`
3. Add/remove columns by editing the `*_headers` lists
4. Modify validation options in the DataValidation sections

## Notes
- Named ranges (`PeopleNames`, `ProjectNames`) power the dropdowns
- Dashboard formulas auto-update when tasks change
- Add new people/projects and they'll appear in dropdowns (up to row 100)
