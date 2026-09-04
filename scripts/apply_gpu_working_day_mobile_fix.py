from pathlib import Path

p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '''function UtilizationPanel({ result, workingDayHours, onWorkingDayHoursChange }) {\n  const u = result.utilization;\n''',
    '''function UtilizationPanel({ result, workingDayHours, onWorkingDayHoursChange }) {\n  // Keep a local editing draft so mobile users can erase the current value\n  // before typing a replacement without committing a transient 0 to the\n  // calculator and making this panel disappear.\n  const [workingDayHoursDraft, setWorkingDayHoursDraft] = useState(String(workingDayHours));\n  useEffect(() => {\n    setWorkingDayHoursDraft(String(workingDayHours));\n  }, [workingDayHours]);\n\n  const handleWorkingDayHoursChange = (raw) => {\n    setWorkingDayHoursDraft(raw);\n    if (raw.trim() === "") return;\n    const next = Number(raw);\n    if (Number.isFinite(next) && next > 0 && next <= 24) {\n      onWorkingDayHoursChange(next);\n    }\n  };\n\n  const handleWorkingDayHoursBlur = () => {\n    const next = Number(workingDayHoursDraft);\n    if (workingDayHoursDraft.trim() === "" || !Number.isFinite(next) || next <= 0 || next > 24) {\n      setWorkingDayHoursDraft(String(workingDayHours));\n    }\n  };\n\n  const u = result.utilization;\n''',
    "UtilizationPanel editing state",
)

replace_once(
    '''          <input\n            type="number"\n            value={workingDayHours}\n            min={0}\n            max={24}\n            step={1}\n            onChange={(e) => onWorkingDayHoursChange(parseFloat(e.target.value) || 0)}\n            className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-right"\n            aria-label="Length of working day, hours per day"\n          />\n''',
    '''          <input\n            type="number"\n            inputMode="numeric"\n            value={workingDayHoursDraft}\n            min={1}\n            max={24}\n            step={1}\n            onChange={(e) => handleWorkingDayHoursChange(e.target.value)}\n            onBlur={handleWorkingDayHoursBlur}\n            className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-right"\n            aria-label="Length of working day, hours per day"\n          />\n''',
    "working day input",
)

if "—" in text or "–" in text:
    raise SystemExit("Prohibited dash character found")

p.write_text(text, encoding="utf-8")
print("Applied GPU working-day mobile editing fix.")
