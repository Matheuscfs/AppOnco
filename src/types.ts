export interface Patient {
  id: string;
  cid_principal: string;
  diagnostico_patologico: string;
}

export interface Exam {
  id: string;
  tipo_documento: string;
  data_exame: string;
  medico_responsavel: string;
  crm_medico: string;
  birads_categoria?: string;
}

export interface TumorMetric {
  id: string;
  data_medicao: string;
  eixo_x_mm: number;
  eixo_y_mm: number;
  eixo_z_mm: number;
  maior_eixo_mm: number;
  tils_porcentagem?: number;
}

export interface MedicalLeave {
  id: string;
  data_inicio: string;
  dias_concedidos: number;
  data_retorno_prevista: string;
  medico_atestado: string;
}

export interface Prescription {
  id: string;
  medicamento: string;
  dosagem: string;
  frequencia: string;
  data_inicio?: string;
  data_fim?: string;
  arquivo_url?: string;
}

export interface ChemoSession {
  id: string;
  tipo: 'Vermelha' | 'Branca';
  ciclo_atual: number;
  total_ciclos: number;
  data_prevista: string;
  realizada: boolean;
}

export interface BloodCount {
  id: string;
  data_exame: string;
  leucocitos: number;
  hemoglobina: number;
  plaquetas: number;
  neutrofilos: number;
}

export interface Symptom {
  id: string;
  sintoma: string;
  intensidade: number;
  data_registro: string;
  notas?: string;
}

export interface MedicationLog {
  id: string;
  prescription_id: string;
  data_tomada: string;
}

export interface Question {
  id: string;
  pergunta: string;
  resposta?: string;
  respondida: boolean;
  data_criacao: string;
}

export interface GalleryImage {
  id: string;
  arquivo_url: string;
  data_captura: string;
  tags: string[];
  categoria: string;
}
