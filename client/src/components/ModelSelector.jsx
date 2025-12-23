import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';

export function ModelSelector({ currentModel, onModelChange, disabled, models = [] }) {
  return (
    <Box sx={{ minWidth: 150 }}>
      <FormControl fullWidth size="small" variant="standard">
        <InputLabel id="model-select-label" sx={{ fontSize: '0.9rem' }}>Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={currentModel}
          label="Model"
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          sx={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '0.9rem', py: 0.5 }}
        >
          {models.map((model) => (
            <MenuItem key={model.value} value={model.value} sx={{ fontSize: '0.9rem', py: 0.5 }}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
