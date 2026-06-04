import { useState } from "react";
import { AutoComplete } from "antd";
import type { LookupItem } from "../api/services/lookups";

interface LookupAutoCompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  search: (keyword?: string) => Promise<{ items: LookupItem[] }>;
  placeholder?: string;
}

// 公司/学校录入:模糊搜索已有项,也可直接输入新值(提交时后端 find-or-create)。
export function LookupAutoComplete({
  value,
  onChange,
  search,
  placeholder,
}: LookupAutoCompleteProps) {
  const [options, setOptions] = useState<{ value: string }[]>([]);

  const load = async (keyword: string) => {
    const res = await search(keyword);
    setOptions(res.items.map((i) => ({ value: i.name })));
  };

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      onSearch={load}
      onFocus={() => {
        if (options.length === 0) void load("");
      }}
      options={options}
      placeholder={placeholder}
      filterOption={false}
      allowClear
    />
  );
}
