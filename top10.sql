with ranked_tracts as (
	select *, row_number() over (partition by `tract_name` order by request_count desc) as rownum
	from (
		select tract_name, request_type, count(*) as request_count
		from service_requests_with_tracts
		where tract_name != ''
		group by tract_name, request_type
		order by request_count
	) as x
)
select tract_name, request_type, request_count from ranked_tracts where rownum <= 10;
