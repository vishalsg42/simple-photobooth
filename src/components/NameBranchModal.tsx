"use client";

import { useState, FormEvent } from "react";

type NameBranchModalProps = {
  onSubmit: (name: string, branch: string) => void;
};

export function NameBranchModal({ onSubmit }: NameBranchModalProps) {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("=== Modal Form Submit ===");
    console.log("Name:", name, "Branch:", branch);
    console.log("Name trimmed:", name.trim(), "Branch trimmed:", branch.trim());
    if (name.trim() && branch.trim()) {
      console.log("Calling onSubmit callback");
      onSubmit(name.trim(), branch.trim());
    } else {
      console.log("Form validation failed - missing name or branch");
    }
  };

  const isFormValid = name.trim().length > 0 && branch.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/20 bg-black/90 p-6 shadow-[0_40px_80px_-40px_rgba(15,15,15,0.8)] sm:p-8">
        <h2 className="mb-6 text-center text-xl font-semibold text-white sm:text-2xl">
          Enter Your Details
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium text-white/90 sm:text-base">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 sm:px-5 sm:py-3.5"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="branch" className="text-sm font-medium text-white/90 sm:text-base">
              Branch
            </label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Enter your branch"
              className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 sm:px-5 sm:py-3.5"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40 sm:px-8 sm:text-base"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default NameBranchModal;

