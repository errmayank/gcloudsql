export interface GCPInstanceAclEntry {
  kind: 'sql#aclEntry';
  name: string;
  value: string;
  expirationTime?: string;
}

export interface GCPProject {
  projectId: string;
  name: string;
}

export interface GCPInstance {
  name: string;
  settings: {
    ipConfiguration: {
      authorizedNetworks: GCPInstanceAclEntry[];
    };
  };
}
