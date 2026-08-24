-- Rename the existing class codes without changing class IDs. Therefore all
-- memberships, chapters, exercises and pending registrations stay connected.
alter table public.classes
  drop constraint if exists classes_code_check;

update public.classes
set
  code = case code
    when 'SM2' then '2SM'
    when 'SM1' then '1SM'
    when 'PC2' then '2PC&SVT'
    when 'TC' then 'TCS'
    else code
  end,
  name = case code
    when 'SM2' then 'Sciences Mathématiques — 2e année'
    when 'SM1' then 'Sciences Mathématiques — 1re année'
    when 'PC2' then 'Physique-Chimie et SVT — 2e année'
    when 'TC' then 'Tronc Commun Scientifique'
    else name
  end;

alter table public.classes
  add constraint classes_code_check
  check (code in ('2SM', '1SM', '2PC&SVT', 'TCS'));
