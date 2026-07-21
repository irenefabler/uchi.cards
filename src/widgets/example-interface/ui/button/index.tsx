type Props = {
  label: string;
};

export const Button = ({ label }: Props) => (
  <button type="button" className="rounded border border-zinc-300 px-3 py-1 text-sm">
    {label}
  </button>
);
