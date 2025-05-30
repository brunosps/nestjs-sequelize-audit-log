const defaultSensitiveFields = [
  'password',
  'senha',
  'ssn',
  'cpf',
  'rg',
  'cnpj',
  'creditCardNumber',
  'numeroCartaoCredito',
  'bankAccount',
  'contaBancaria',
  'routingNumber',
  'numeroAgencia',
  'address',
  'endereco',
  'phoneNumber',
  'telefone',
  // 'email',
  'birthdate',
  'dataNascimento',
  'motherName',
  'nomeMae',
  'fatherName',
  'nomePai',
  'passportNumber',
  'numeroPassaporte',
  'driverLicense',
  'cnh',
  'biometricData',
  'dadosBiometricos',
  'healthData',
  'dadosSaude',
  'geneticData',
  'dadosGeneticos',
  'ethnicity',
  'etnia',
  'religion',
  'religiao',
  'politicalAffiliation',
  'afiliacaoPolitica',
  'sexualOrientation',
  'orientacaoSexual',
  'geolocation',
  'geolocalizacao',
  'ipAddress',
  'enderecoIP',
  'macAddress',
  'enderecoMAC',
  'income',
  'renda',
  'maritalStatus',
  'estadoCivil',
  'socialSecurityNumber',
  'numeroPrevidenciaSocial',
  'educationLevel',
  'nivelEscolaridade',
  'employmentHistory',
  'historicoEmpregos',
  'criminalRecord',
  'antecedentesCriminais',
  'financialData',
  'dadosFinanceiros',
];

export function sanitizePayload(
  payload: any,
  sensitiveFields: string[] = defaultSensitiveFields,
): any {
  const sanitizedPayload = { ...payload };

  for (const field of sensitiveFields) {
    if (sanitizedPayload.hasOwnProperty(field)) {
      sanitizedPayload[field] = '[REDACTED]';
    }
  }

  return sanitizedPayload;
}
