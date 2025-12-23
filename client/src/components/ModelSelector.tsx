
import { FormControl, InputLabel, Select, MenuItem, Box, SelectChangeEvent } from '@mui/material';
import { IModelConfig } from '../types';

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
  models: IModelConfig[];
}

export function ModelSelector({ currentModel, onModelChange, disabled, models = [] }: ModelSelectorProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onModelChange(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 150 }}>
      <FormControl fullWidth size="small" variant="standard">
        <InputLabel id="model-select-label" sx={{ fontSize: '0.9rem' }}>Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={currentModel}
          label="Model"
          onChange={handleChange}
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
