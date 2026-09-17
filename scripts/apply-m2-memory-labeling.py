from pathlib import Path


def replace_exact(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    return text.replace(old, new)

p = Path('src/modelSizingMethodology.js')
s = p.read_text()
s = replace_exact(
    s,
    'basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state.",',
    'basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state. Activation and temporary-workspace memory remains workload-specific and is not separately modeled here.",',
    1,
    'memory basis caveat',
)
p.write_text(s)

p = Path('src/GpuSizingCalculator.jsx')
s = p.read_text()
s = replace_exact(
    s,
    ': `Training memory required: ${result.trainingMemoryGB.toFixed(1)} GB using resident parameters; training compute uses ${result.trainingSemantics.activeComputeParamsB}B active parameters for this model. GPU count = max(GPUs to fit the model, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}',
    ': `Resident training-state memory modeled: ${result.trainingMemoryGB.toFixed(1)} GB using resident parameters; activation and temporary-workspace memory is workload-specific and not separately modeled. Training compute uses ${result.trainingSemantics.activeComputeParamsB}B active parameters for this model. GPU count = max(GPUs to fit resident state, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}',
    2,
    'training methodology copy',
)
s = replace_exact(
    s,
    '<AuditFormula label={`Training memory required (${modelLabel}, ${m.totalParamsB}B resident params)`}',
    '<AuditFormula label={`Resident training-state memory (${modelLabel}, ${m.totalParamsB}B resident params)`}',
    1,
    'audit label',
)
p.write_text(s)

print('M2 memory labeling patch applied')
