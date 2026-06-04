import { useState } from "react";
import { Select } from "antd";
import type { LookupItem } from "../api/services/lookups";

interface LookupSelectProps {
  value?: string;
  onChange?: (value?: string) => void;
  search: (keyword?: string) => Promise<{ items: LookupItem[] }>;
  placeholder?: string;
  style?: React.CSSProperties;
}

// 公司/学校筛选下拉:搜索已有项,选中返回其 id(用于按实体筛选)。
export function LookupSelect({
  value,
  onChange,
  search,
  placeholder,
  style,
}: LookupSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

  const load = async (keyword: string) => {
    const res = await search(keyword);
    setOptions(res.items.map((i) => ({ value: i.id, label: i.name })));
  };

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={onChange}
      onSearch={load}
      onFocus={() => {
        if (options.length === 0) void load("");
      }}
      filterOption={false}
      options={options}
      placeholder={placeholder}
      style={style}
    />
  );
}
