import { AVAILABLE_MODELS } from '../api/chatService';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';

export function ModelSelector({ currentModel, onModelChange, disabled }) {
  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={currentModel}
          label="Model"
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          sx={{ backgroundColor: 'white', color: 'black' }}
        >
          {AVAILABLE_MODELS.map((model) => (
            <MenuItem key={model} value={model}>
              {model}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
