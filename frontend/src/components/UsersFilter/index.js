import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

export function UsersFilter({ onFiltered, initialUsers }) {
  const [users, setUsers] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadUsers();
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (Array.isArray(initialUsers)) {
      const cleaned = initialUsers.filter(u => u !== null);
      setSelecteds(cleaned);
    }
  }, [initialUsers]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get(`/users/list`);
      const userList = data.map((u) => ({ id: u.id, name: u.name }));
      setUsers(userList);
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
    <Box style={{ padding: "0px 10px 10px" }}>
      <Autocomplete
        multiple
        size="small"
        options={users}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getUserProps) =>
          value.map((option, index) => {
            if (!option) return null;
            return (
              <Chip
                key={index}
                variant="outlined"
                style={{
                  backgroundColor: "#bfbfbf",
                  textShadow: "1px 1px 1px #000",
                  color: "white",
                }}
                label={option.name}
                {...getUserProps({ index })}
                size="small"
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={i18n.t("tickets.search.filterUsers")}
          />
        )}
      />
    </Box>
  );
}
