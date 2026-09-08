import { suiteAsset } from '@/lib/suite-paths';
const petNames = [
  '狐狸',
  '貓咪',
  '小狗',
  '兔子',
  '熊貓',
  '無尾熊',
  '老虎',
  '青蛙',
];
export function PetArt({
  pet,
  className = '',
}: {
  pet: number;
  className?: string;
}) {
  const index = Math.max(0, Math.min(7, pet));
  return (
    <span
      className={`pet-art ${className}`}
      role="img"
      aria-label={`${petNames[index]}小夥伴`}
      style={{
        backgroundImage: `url(${suiteAsset('design/pet-atlas.png')})`,
        backgroundPosition: `${((index % 4) / 3) * 100}% ${Math.floor(index / 4) * 100}%`,
      }}
    />
  );
}
