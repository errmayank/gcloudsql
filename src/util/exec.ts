import util from 'util'
import { exec as nativeExec } from 'child_process'

export const exec = async (cmd: string) => {
  try {
    const { stdout, stderr } = await util.promisify(nativeExec)(cmd)
    if (stderr) console.error(stderr)

    return stdout.trim()
  } catch (e) {
    console.error(e)
  }
}
