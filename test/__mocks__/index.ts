const mock = jest.fn().mockImplementation(() => {
  return {
    getAge: jest.fn().mockReturnValue(30),
    getGender: jest.fn(),
  };
});

export default mock;
