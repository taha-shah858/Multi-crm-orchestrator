"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; labelClassName?: string };

export default function PasswordInput({ label, labelClassName, className = "", id, disabled, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className={labelClassName}>{label}</label>
      <div className="relative">
        <input {...props} id={inputId} disabled={disabled} type={visible ? "text" : "password"} className={`${className} pr-10`} />
        <button type="button" disabled={disabled} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible}
          onClick={() => setVisible(current => !current)} className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 hover:text-blue-600 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600">
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
