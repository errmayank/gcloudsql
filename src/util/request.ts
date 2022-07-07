import got, { Options } from 'got'

export const request = async <T>(options: Partial<Options>): Promise<[T, null] | [null, any]> => {
  try {
    const response: any = await got({ ...options, responseType: 'json' })

    return [response?.body, null]
  } catch (error) {
    return [null, error]
  }
}
