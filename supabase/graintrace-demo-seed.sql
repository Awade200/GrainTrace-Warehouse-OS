
begin;
insert into graintrace.mills(id,name,address,latitude,longitude,contact,status) values
('00000000-0000-4000-8000-000000000101','Demo Palm Mill A','Demo address, Oyo State',7.8400000,3.9300000,'Demo only','approved'),
('00000000-0000-4000-8000-000000000102','Demo Palm Mill B','Demo address, Ogun State',7.1500000,3.3500000,'Demo only','approved'),
('00000000-0000-4000-8000-000000000103','Demo Palm Mill C','Demo address, Osun State',7.7700000,4.5600000,'Demo only','approved')
on conflict(id) do nothing;
insert into graintrace.receipts(id,reference,mill_id,notes) values
('00000000-0000-4000-8000-000000000201','DEMO-GATE-A','00000000-0000-4000-8000-000000000101','Fictional training record'),
('00000000-0000-4000-8000-000000000202','DEMO-GATE-B','00000000-0000-4000-8000-000000000102','Fictional training record'),
('00000000-0000-4000-8000-000000000203','DEMO-GATE-C','00000000-0000-4000-8000-000000000103','Fictional training record')
on conflict(id) do nothing;
insert into graintrace.bags(id,receipt_id,code,gate_kg,clean_kg,processed_at) values
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','DEMO-BAG-A',16,14.5,now()),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000202','DEMO-BAG-B',22,20,now()),
('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000203','DEMO-BAG-C',17,15.5,now())
on conflict(id) do nothing;
insert into graintrace.dispatches(id,reference,buyer,scale_kg) values
('00000000-0000-4000-8000-000000000401','DEMO-DSP-001','Demo Biomass Buyer',50)
on conflict(id) do nothing;
insert into graintrace.dispatch_lines(dispatch_id,bag_id,weight_kg) values
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000301',14.5),
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000302',20),
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000303',15.5)
on conflict(dispatch_id,bag_id) do nothing;
commit;