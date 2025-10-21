export interface SimulationProps {
  seed?: number;
  onComplete?: () => void;
  difficulty?: string;
  [key: string]: any;
}
