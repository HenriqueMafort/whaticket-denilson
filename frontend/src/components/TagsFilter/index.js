import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export function TagsFilter({ onFiltered, initialTags }) {
  const [tags, setTags] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadTags();
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelecteds([]);
    if (
      Array.isArray(initialTags) &&
      Array.isArray(tags) &&
      tags.length > 0
    ) {
      onChange(initialTags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTags, tags]);

  const loadTags = async () => {
    try {
      const { data } = await api.get(`/tags/list`);
      setTags(data);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    const cleaned = (value || []).filter(v => v !== null);
    setSelecteds(cleaned);
    onFiltered(cleaned);
  };

  return (
    <Box style={{ padding: 10 }}>
      <Autocomplete
        multiple
        size="small"
        options={tags}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            if (!option) return null;
            return (
              <Chip
                key={index}
                variant="outlined"
                style={{
                  backgroundColor: option.color || "#eee",
                  textShadow: "1px 1px 1px #000",
                  color: "white",
                }}
                label={option.name}
                {...getTagProps({ index })}
                size="small"
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Filtro por Tags"
          />
        )}
      />
    </Box>
  );
}
