interface IUser {
  name: string;
  password: string;
}

const users: Array<IUser> = [];

export const reg = (rawData: string): string => {
  const { name = "", password = "" } = JSON.parse(rawData);

  console.log({ name, password });

  let user = users.find(user => user.name === name);

  console.log({ users, user });
  if (user) {
    let errorText = "";
    const userIndex = users.findIndex(user => user.name === name);

    if (user.password !== password) {
      errorText = "Wrong password";
    }

    const resData = {
      name,
      index: userIndex,
      error: !!errorText,
      errorText,
    };

    return JSON.stringify(resData);
  }
  user = { name, password };
  users.push(user);

  const resData = {
    name,
    index: users.length - 1,
    error: false,
    errorText: "",
  };
  return JSON.stringify(resData);
};
