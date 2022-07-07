import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import { isEmpty } from 'lodash-es'

import { exec } from './util/exec'
import { request } from './util/request'
import type { GCPInstance, GCPInstanceAclEntry, GCPProject } from './util/types'

const main = async () => {
  const accessToken = await exec('gcloud auth print-access-token')

  const spinner = createSpinner('Fetching projects for your account').start()
  const [projectsData, projectsError] = await request<{ projects: GCPProject[] }>({
    method: 'GET',
    url: 'https://cloudresourcemanager.googleapis.com/v1beta1/projects',
    searchParams: {
      filter: 'lifecycleState:ACTIVE parent.type:organization',
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (projectsError) {
    spinner.clear()
    spinner.error()
    console.error(chalk.red(projectsError))

    process.exit(1)
  }
  if (!projectsData || isEmpty(projectsData.projects)) {
    spinner.clear()
    spinner.error({ text: chalk.red('No projects found, Aborting.') })

    process.exit(1)
  }

  spinner.success({
    text: chalk.green(`Found ${projectsData.projects.length} projects under your account.`),
  })

  const projectIds = projectsData.projects
    .sort((p1, p2) => p1.name.toLocaleLowerCase().localeCompare(p2.name.toLocaleLowerCase()))
    .map(p => p.projectId)

  const promptProjectsAndGetInstances = async (): Promise<{
    selectedProjectId: string
    instances: {
      name: string
      authorizedNetworks: GCPInstanceAclEntry[]
    }[]
  }> => {
    const { selectedProjectId } = await inquirer.prompt({
      name: 'selectedProjectId',
      message: 'Select a project',
      type: 'list',
      loop: false,
      pageSize: 20,
      choices: projectIds,
    })
    const spinner = createSpinner(`Fetching SQL instances for ${selectedProjectId}`).start()
    const [instancesData, instancesError] = await request<{
      items: GCPInstance[]
    }>({
      method: 'GET',
      url: `https://sqladmin.googleapis.com/sql/v1beta4/projects/${selectedProjectId}/instances`,
      searchParams: {
        filter: 'state:RUNNABLE instanceType:CLOUD_SQL_INSTANCE',
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (instancesError) {
      spinner.clear()
      spinner.error()
      console.error(chalk.red(instancesError))

      return promptProjectsAndGetInstances()
    }
    if (!instancesData || isEmpty(instancesData.items)) {
      spinner.clear()
      spinner.error({ text: chalk.red(`No SQL instances found for ${selectedProjectId}`) })

      return promptProjectsAndGetInstances()
    }

    spinner.success({
      text: chalk.green(
        `Found ${instancesData.items.length} SQL instances for ${selectedProjectId}`,
      ),
    })

    return {
      selectedProjectId,
      instances: instancesData.items.map(i => ({
        name: i.name,
        authorizedNetworks: i.settings.ipConfiguration.authorizedNetworks
          .filter(
            (value, index, self) =>
              self
                .map(value => value.name.toLocaleLowerCase())
                .indexOf(value.name.toLocaleLowerCase()) === index,
          )
          .sort((n1, n2) => n1.name.toLocaleLowerCase().localeCompare(n2.name.toLocaleLowerCase())),
      })),
    }
  }

  const { selectedProjectId, instances } = await promptProjectsAndGetInstances()

  const { selectedInstanceId } = await inquirer.prompt({
    name: 'selectedInstanceId',
    message: 'Select an instance',
    type: 'list',
    loop: false,
    pageSize: 20,
    choices: instances,
  })

  const selectedInstance = instances.find(i => i.name === selectedInstanceId)

  if (!selectedInstance) {
    console.error(chalk.red('Something went wrong, Aborting.'))
    process.exit(1)
  }
  if (isEmpty(selectedInstance.authorizedNetworks)) {
    console.log('No existing authorized networks found')
    process.exit(0)
  }

  const { updateExisting } = await inquirer.prompt({
    name: 'updateExisting',
    message: 'Update an existing authorized network entry?',
    type: 'list',
    loop: false,
    pageSize: 20,
    choices: ['Yes', 'No'],
  })

  if (updateExisting === 'Yes') {
    const { selectedNetworkName } = await inquirer.prompt({
      name: 'selectedNetworkName',
      message: 'Select an authorized network',
      type: 'list',
      loop: false,
      pageSize: 20,
      choices: selectedInstance.authorizedNetworks.map(n => n.name),
    })

    const selectedNetwork = selectedInstance.authorizedNetworks.find(
      i => i.name === selectedNetworkName,
    )

    if (!selectedNetwork) {
      console.error(chalk.red('Something went wrong, Aborting.'))
      process.exit(1)
    }

    const ipAddress = await exec('curl -s GET checkip.amazonaws.com')

    if (!ipAddress) {
      console.error(chalk.red('Failed to get IP address, Aborting.'))
      process.exit(1)
    }

    const cidrIpAddress = ipAddress.replace(/(?<=\.)([0-9]{1,3})$/, '0/24')

    const existingNetworkNameIdx = selectedInstance.authorizedNetworks.findIndex(
      network => network.name.toLowerCase() === selectedNetworkName.toLowerCase(),
    )

    selectedInstance.authorizedNetworks[existingNetworkNameIdx] = {
      ...selectedInstance.authorizedNetworks[existingNetworkNameIdx],
      value: cidrIpAddress,
    }

    const spinner = createSpinner(`Updating ${chalk.underline(selectedNetworkName)}`).start()
    const [_updateNetworkData, updateNetworkError] = await request<{
      items: GCPInstance[]
    }>({
      method: 'PATCH',
      url: `https://sqladmin.googleapis.com/sql/v1beta4/projects/${selectedProjectId}/instances/${selectedInstanceId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        settings: {
          ipConfiguration: {
            authorizedNetworks: selectedInstance.authorizedNetworks,
          },
        },
      }),
    })

    if (updateNetworkError) {
      spinner.clear()
      spinner.error()
      console.error(chalk.red(updateNetworkError))
      process.exit(1)
    }

    spinner.success({
      text: chalk.green(
        `Success! Updated ${chalk.underline(
          selectedNetworkName,
        )}, new IP address: ${chalk.underline(cidrIpAddress)}`,
      ),
    })

    process.exit(0)
  } else {
    console.log('Aborting.')
    process.exit(0)
  }
}

main()
