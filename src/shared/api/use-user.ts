import { useQuery } from '@tanstack/react-query';
import { Api } from './base';
import { DefaultUser } from './mocks/default-user';

const api = new Api();

export const userKeys = {
  all: ['user'] as const,
  current: () => [...userKeys.all, 'current'] as const
};

export const useUserQuery = () =>
  useQuery<DefaultUser>({
    queryKey: userKeys.current(),
    queryFn: () => api.fetchUser()
  });
