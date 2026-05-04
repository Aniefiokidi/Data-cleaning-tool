interface Props {
  oldValue: string;
  newValue: string;
}

export const CorrectionDiff: React.FC<Props> = ({ oldValue, newValue }) => (
  <div className="text-sm">
    <span className="mr-2 text-slate-400 line-through">{oldValue}</span>
    <span className="font-semibold text-green-600">{newValue}</span>
  </div>
);
