DROP policy if exists "Permissive rules for all" ON public.transactions;

CREATE policy "Users can manage their own transactions" ON public.transactions
   FOR all
   using (auth.uid() = user_id)
   with check(auth.uid() = user_id);

ALTER TABLE public.transactions 
ALTER COLUMN user_id SET DEFAULT auth.uid();