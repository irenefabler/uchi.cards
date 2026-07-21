import { useUserQuery } from 'src/shared/api';

export const Preloader = () => {
  const { isPending } = useUserQuery();
  if (!isPending) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/60">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-500" />
    </div>
  );
};
