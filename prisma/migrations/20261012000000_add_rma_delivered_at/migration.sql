-- Data de entrega ao cliente.
--
-- Aditiva e anulavel: nenhuma linha existente e tocada. Os RMAs ja entregues
-- ficam com NULL, e a listagem ordena-os a seguir aos que tem data, em vez de
-- inventar uma data de entrega que ninguem registou.
ALTER TABLE "RMA" ADD COLUMN "deliveredAt" TIMESTAMP(3);
