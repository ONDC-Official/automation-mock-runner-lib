// Mock implementation of uuid for Jest tests
export const v4 = jest.fn(
	() => "mocked-uuid-v4-12345678-1234-1234-1234-123456789012",
);

export default {
	v4,
};
