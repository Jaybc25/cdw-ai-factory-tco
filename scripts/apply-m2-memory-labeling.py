from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)

p = Path('src/modelSizingMethodology.js')
s = p.read_text()
s = replace_once(
    s,
    'basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state.",',
    'basis: "NVIDIA Megatron Core mixed-precision Adam baseline: 18 bytes/parameter for resident model + optimizer state. FP8 is treated as compute precision and does not automatically halve stored model/optimizer state. Activation and temporary-workspace memory remains workload-specific and is not separately modeled here.",',
    'memory basis caveat',
)
p.write_text(s)

p = Path('src/GpuSizingCalculator.jsx')
s = p.read_text()
s = replace_once(
    s,
    ': `Training memory required: ${result.trainingMemoryGB.toFixed(1)} GB using resident parameters; training compute uses ${result.trainingSemantics.activeComputeParamsB}B active parameters for this model. GPU count = max(GPUs to fit the model, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}',
    ': `Resident training-state memory modeled: ${result.trainingMemoryGB.toFixed(1)} GB using resident parameters; activation and temporary-workspace memory is workload-specific and not separately modeled. Training compute uses ${result.trainingSemantics.activeComputeParamsB}B active parameters for this model. GPU count = max(GPUs to fit resident state, GPUs to hit the time target), rounded to a ${result.selectedNodeSize}-GPU node.`}',
    'report training caveat',
)
s = replace_once(
    s,
    '<AuditFormula label={`Training memory required (${modelLabel}, ${m.totalParamsB}B resident params)`}',
    '<AuditFormula label={`Resident training-state memory (${modelLabel}, ${m.totalParamsB}B resident params)`}',
    'audit label',
)
p.write_text(s)

print('M2 memory labeling patch applied')
