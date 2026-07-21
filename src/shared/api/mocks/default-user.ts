export const getDefaultUser = () => ({
  id: -1,
  name: 'Мария',
  surname: 'Иванова',
  hasPremium: false,
  gender: ''
});

export type DefaultUser = ReturnType<typeof getDefaultUser>;
